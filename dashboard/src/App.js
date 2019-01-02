import React, { Component } from 'react';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Layout from 'antd/lib/layout';
import Table from 'antd/lib/table';
import Card from 'antd/lib/card';
import Skeleton from 'antd/lib/skeleton';
import Upload from 'antd/lib/upload';
import Spin from 'antd/lib/spin';
import Icon from 'antd/lib/icon';
import message from 'antd/lib/message';
import axios from 'axios';
import moment from 'moment';
import './App.css';

const defaultCode = `// \`run\` function will be executed by Peery
const run = (dataRow) => {
  return dataRow[0] * dataRow[1];
};`;
class App extends Component {
  state = {
    activePeers:null,
    refreshingActivePeers: false,
    sendingTask: false,
    code: defaultCode,
  }

  componentDidMount() {
    this.refreshDataInterval = setInterval(() => {
      this.refreshActivePeers();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.refreshDataInterval);
  }

  mapPeerRow = (row, idx) => {
    return { ...row, idx, lastOnline: moment(row.lastOnline).format('HH:mm:ss') };
  }
  refreshActivePeers = () => {
    console.log('refreshing...');

    this.setState({ refreshingActivePeers: true });
    axios.get('http://localhost:3140/peers').then(resp => {
      this.setState({ activePeers: resp.data.peers.map(this.mapPeerRow), refreshingActivePeers: false });
    })
  }

  render() {
    const { sendingTask, activePeers } = this.state;
    const columns = [{
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
    return (
      <div className="App">
        <Layout.Content>
          <Card title="Active Peers">
          {activePeers ? <Table dataSource={activePeers} columns={columns} /> : <Skeleton />}
          </Card>

          <Card title="Send Task" style={{ marginTop: 20 }}>
            <h4>Code:</h4>
            <Input.TextArea autosize value={this.state.code} onChange={code => this.setState({ code })} />

            <h4 style={{ marginTop: 10 }}>Data file: (optional)</h4>
            <Upload {...{
                name: 'file',
                action: '//jsonplaceholder.typicode.com/posts/',
                headers: {
                  authorization: 'authorization-text',
                },
                onChange(info) {
                  if (info.file.status !== 'uploading') {
                    console.log(info.file, info.fileList);
                  }
                  if (info.file.status === 'done') {
                    message.success(`${info.file.name} file uploaded successfully`);
                  } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} file upload failed.`);
                  }
                },
              }}>
              <Button>
                <Icon type="upload" /> Click to Upload
              </Button>
            </Upload>

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