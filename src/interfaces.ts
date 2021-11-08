interface customDebugConfiguration {
    "path": string
        "launch_config": {
            "name": string,
            "type": string,
            "request": string
        }
}

interface breakpoint {
    "enabled": boolean,
    "location": {
        "uri": {
            "external": string,
            "path": string,
            "scheme": "file"
        }
    }
}

export {
    customDebugConfiguration,
    breakpoint
};