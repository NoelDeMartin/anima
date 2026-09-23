# Ànima

An AI agent that works with your [Solid POD](https://solidproject.org).

> [!WARNING]
> ⚠️ This is still a work in progress! You can learn more about it in my website: [Raising an Agent](https://noeldemartin.com/tasks/raising-an-agent).

## Installation & Usage

Ànima can be used in different ways, depending on your preference:

### SPA (Single Page Application)

This is the live version that you will find in [anima.noeldemartin.com](https://anima.noeldemartin.com).

Here, Ànima runs 100% in the browser, and it'll connect directly with your POD after you log in.

One obvious drawback of this approach is that conversations are coupled to the frontend. If you close the browser before an AI returns its response, it will be lost. Responses that are completed correctly are saved in the POD, so you won't be losing those.

### Desktop App

This is the version you can download from the files attached to [GitHub releases](https://github.com/NoelDeMartin/anima/releases). They are self-contained native binaries that you can run on Windows, macOS, and Linux (I haven't tested most of them, though, so let me know if something doesn't work in your device!).

In this flavor, Ànima comes with a built-in POD you can use to store data in a local folder of your choice. When the service is running, it will be available in port `:1191`; so you can also use it from devices in the same network if your computer is reachable (e.g. `http://192.168.1.19:1191`).

### Service

This version is not easily installable yet, other than cloning this repository and installing the dependencies. Eventually, I'll probably publish a Docker image or an npm package.

Ànima can be served as a traditional server-side application, and it'll return the same frontend used for the SPA and Desktop versions but routing authentication and model interaction through the backend. If the `MANAGED_POD` env variable is set to `true`, it will also run a built-in POD and allow registrations.
