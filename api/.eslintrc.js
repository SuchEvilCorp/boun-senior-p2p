module.exports = {
    "env": { "es6": true, "node": true },
    "extends": "airbnb-base",
    "parser": "babel-eslint",
    "rules": {
        "no-console": 0,
        "strict": 0,
        "comma-dangle": ["error", "never"],
        "no-unused-vars": ["warn"],
        "no-var": ["off"],
        "one-var": ["off"],
        "indent": ["error", 2],
        "linebreak-style": ["error", "unix"],
        "quotes": ["error", "single"],
        "semi": ["error", "always"]
    }
};
