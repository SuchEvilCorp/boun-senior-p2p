import React, { Component, Fragment } from 'react';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Layout from 'antd/lib/layout';
import Table from 'antd/lib/table';
import Card from 'antd/lib/card';
import Skeleton from 'antd/lib/skeleton';
import Upload from 'antd/lib/upload';
import Spin from 'antd/lib/spin';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import message from 'antd/lib/message';
import axios from 'axios';
import moment from 'moment';
import './App.css';
import uploadS3 from './uploadS3';

const defaultCode = `// \`run\` function will be executed by Peery
const run = (dataRow) => {
  return dataRow[0] * dataRow[1];
};`;
class App extends Component {
  state = {
    activePeers: null,
    tasks: null,
    sendingTask: false,
    dataUploadMethod: 'basic',
    code: defaultCode,
    data: {},
  }

  componentDidMount() {
    this.refreshActivePeers();
    this.refreshTasks();

    this.refreshDataInterval = setInterval(() => {
      this.refreshActivePeers();
    }, 3000);
    this.refreshTaskInterval = setInterval(() => {
      this.refreshTasks();
    }, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.refreshDataInterval);
    clearInterval(this.refreshTaskInterval);
  }

  mapPeerRow = (row, idx) => {
    return { ...row, idx, lastOnline: moment(row.lastOnline).format('HH:mm:ss') };
  }

  mapTaskRow = (row, idx) => {
    return { ...row, idx };
  }

  refreshActivePeers = () => {
    axios.get('http://localhost:3140/peers').then(resp => {
      this.setState({ activePeers: resp.data.peers.map(this.mapPeerRow) });
    })
  }

  refreshTasks = () => {
    axios.get('http://localhost:3140/task').then(resp => {
      this.setState({ tasks: resp.data.tasks.map(this.mapTaskRow) });
    })
  }

  uploadDataFile = param => {
    return uploadS3(param).then(resp => {
      message.success('Data file successfully uploaded');

      let fileType = resp.Location.match(/.*(\..*)$/)[1];
      if (fileType) {
        fileType = fileType.slice(1);
      } else {
        fileType = 'csv'; // default
      }
      this.setState({ data: {
        type: fileType,
        payload: resp.Location,
      }})
    }).catch(err => {
      message.error(`Error while uploading file: ${err.message}`);
    });
  }

  sendTask = () => {
    return axios.post('http://localhost:3140/task', {
      // TODO: add ownerId
      code: this.state.code,
      data: this.state.data
    }).then(resp => {
      message.success('Successfully sent the task');
      this.setState({ data: {} });
    })
  }

  render() {
    const { sendingTask, tasks, activePeers } = this.state;
    const peerColumns = [{
      title: '#',
      dataIndex: 'idx',
      key: 'idx',
    }, {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    }, {
      title: 'Last Online',
      dataIndex: 'lastOnline',
      key: 'lastOnline',
    }];
    const taskColumns = [{
      title: '#',
      dataIndex: 'idx',
      key: 'idx',
    }, {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
    }, {
      title: 'Peers',
      dataIndex: 'peers',
      key: 'peers',
      render: peers => JSON.stringify(peers)
    }, {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
    }, {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: date => date ? new Date(date).toLocaleString() : 'Not yet',
    }, {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => new Date(date).toLocaleString(),
    }];
    return (
      <div className="App">
        <Layout.Content>
          <Card title="Active Peers">
          {activePeers ? <Table dataSource={activePeers} columns={peerColumns} rowKey="id" /> : <Skeleton />}
          </Card>

          <Card title="Tasks" style={{ marginTop: 20 }}>
          {tasks ? <Table dataSource={tasks} columns={taskColumns} rowKey="_id" /> : <Skeleton />}
          </Card>

          <Card title="Send Task" style={{ marginTop: 20 }}>
            <h4>Code:</h4>
            <Input.TextArea autosize={{ minRows: 2, maxRows: 6 }} value={this.state.code} onChange={e => this.setState({ code: e.target.value })} />

            <h4 style={{ marginTop: 10 }}>Data (optional):</h4>
            <Menu
                onClick={e => this.setState({ dataUploadMethod: e.key, data: {} })}
                selectedKeys={[this.state.dataUploadMethod]}
                mode="horizontal"
                style={{ marginBottom: 10 }}>
                <Menu.Item key="basic">
                  Enter Data by Hand
                </Menu.Item>
                <Menu.Item key="file">
                  Upload Data File
                </Menu.Item>
              </Menu>
              {this.state.dataUploadMethod === 'basic' && (
                <Input.TextArea autosize={{ minRows: 4, maxRows: 6 }} value={this.state.data.payload} onChange={e => this.setState({ data: { type: 'csv', payload: e.target.value } })} placeholder="Comma separated values (CSV data)" />
              )}
              {this.state.dataUploadMethod === 'file' && (
                <Upload customRequest={this.uploadDataFile}>
                  <Button>
                    <Icon type="upload" /> Click to Upload
                  </Button>
                </Upload>
              )}

            <Button
              type="primary"
              style={{ marginTop: 20 }}
              disabled={sendingTask}
              onClick={this.sendTask}>
            {sendingTask ? <Spin /> : 'Send'}
            </Button>
          </Card>
        </Layout.Content>
      </div>
    );
  }
}

export default App;