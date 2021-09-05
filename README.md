# CS50 VSIX

A Visual Studio Code (VS Code) extension that runs a built-in graphical debugger inside VS Code.

### Installation
```
npm install
npm install -g vsce
vsce package
code --install-extension cs50-0.0.1.vsix
```

### debug50 Usage
```
chmod +x ./debug50.py
./debug50.py hello.py
./debug50.py hello
```

This tool is currently under development.