# Image Test README

This README tests image display in the preview.

## Local Image Test

Here's a local image (if it exists):

![Local Image](./assets/image.png)

## External Image Test

Here's an external image from the web:

![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

## How Images Should Work

- **Local images** should be converted from relative paths to proper webview URIs
- **External images** should work with their original URLs
- Images should be responsive and styled properly

## Code Example

```javascript
// This is just a test
const image = "test.png";
console.log("Image path:", image);
```

> **Note**: If the local image doesn't exist, you'll see the alt text instead.
