![中文文档](./README.md)  
![English Document](./README.en.md)

## Features

- [x] Chinese handwriting
- [x] Multi-canvas support
- [x] Field adapter scripts for multi-templates
- [x] More color choices
- [ ] Additional border styles
- [ ] Font selection
- [x] Mobile experience optimization (details TBD)
- [x] AI-generated content
- [x] Fix PDF parsing issue
- [x] Animation display effect

## Screenshots

![](./dev-docs/images/ScreenShot1.png) ![](./dev-docs/images/ScreenShot2.png)

## Environment Variables

```
REACT_AI_API= // Your AI API endpoint, e.g., https://api.openai.com/v1/chat/completions
REACT_AI_SECRET= // Your AI API secret key, e.g., sk-1234567890abcdef1234567890abcdef
REACT_AI_MODEL= // Your AI model name, e.g., gpt-3.5-turbo
```

## Live Demo

https://excalidraw-phi-woad.vercel.app/

## Local Installation

These instructions will get you a copy of the project up and running on your local machine for development and testing.

### Requirements

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/getting-started/install) (v1 or v2.4.2+)
- [Git](https://git-scm.com/downloads)

### Clone the repo

```bash
git clone https://github.com/linkxzhou/SimpleExcalidraw.git
```

### Install dependencies

```bash
yarn
```

### Start the server

```bash
yarn start
```

Now you can open [http://localhost:3000](http://localhost:3000) and start coding in your favorite editor.

### Collaboration

For collaboration, set up the local collab server: https://github.com/excalidraw/excalidraw-room

### Commands

#### Install dependencies

```
yarn
```

#### Run the project

```
yarn start
```

#### Reformat all files with Prettier

```
yarn fix
```

#### Run tests

```
yarn test
```

#### Update test snapshots

```
yarn test:update
```

#### Test for formatting with Prettier

```
yarn test:code
```

### Docker Compose

You can use docker-compose to work on Excalidraw locally if you don't want to set up a Node.js environment.

```sh
docker-compose up --build -d
```

## Animation Implementation

This project implements a whiteboard animation feature based on SVG and Web Animations API (WAAPI), allowing users to replay the drawing process.

### Core Architecture

The animation module is mainly located in the `src/animate` directory and consists of the following core parts:

1.  **`AnimateApp.tsx`**: The entry component for the animation feature, displayed as a Modal. It is responsible for managing global state (such as duration, loop toggle, pause state) and coordinating the `Viewer` and `AnimateConfig` components.
2.  **`Viewer.tsx`**: Responsible for rendering SVG content and executing animations.
    - It first calls `exportToSvg` to convert the current whiteboard content into an SVG DOM.
    - Then it calls `animateSvg` to apply animation effects to the SVG elements.
3.  **`AnimateConfig.tsx`**: Provides the user control interface, including duration selection, loop toggle, and replay button.
4.  **`animate.ts`**: Contains the core animation logic.

### Animation Principle (`animate.ts`)

The animation generation process is fully automated and does not require users to manually set keyframes. The main steps are as follows:

1.  **Preprocessing and Metrics**:
    - Traverse SVG child elements and hide all elements.
    - Calculate the "metric" for each element: For `<path>` elements, calculate the total path length (`getTotalLength()`); for other elements like text or images, assign a fixed metric value.
2.  **Time Allocation**:
    - Allocate the total animation duration to each element based on the proportion of its metric to the total metric, ensuring that longer paths have longer drawing times for a more natural visual effect.
3.  **Animation Generation (WAAPI)**:
    - **Path Animation**: Use `stroke-dasharray` and `stroke-dashoffset` techniques to simulate handwriting effects. Also handles fills, fading in the fill color after the outline is drawn.
    - **Non-Path Animation (Text/Images)**: Use simple opacity fade-in effects.
    - **Timing Control**: Control the playback order of elements via the `delay` property and set slight overlap times to make the animation smoother.
4.  **Control and Looping**:
    - Returns a controller object (`controller`) supporting `play`, `pause`, `cancel`, and `seek` operations.
    - Loop playback is implemented by triggering `animateSvg` again via `setTimeout` after the animation ends.

The advantage of this approach is the ability to accurately capture complex WAAPI-driven SVG animations, not limited to simple CSS transformations. Install dependencies

## Project Sources

(1) https://github.com/korbinzhao/excalidraw-cn  
(2) https://github.com/excalidraw/excalidraw
