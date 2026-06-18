module.exports = {
  // if the app is supposed to run on Github Pages in a subfolder, use the following config:
  // publicPath: process.env.NODE_ENV === "production" ? "/townsquare/" : "/"
  publicPath: process.env.NODE_ENV === "production" ? "/" : "/",
  devServer: {
    proxy: {
      "/api/script-poster-image": {
        target:
          process.env.VUE_APP_TOWNSQUARE_IMAGE_PROXY || "http://localhost:8081",
        changeOrigin: true,
      },
      "/api/script-poster-render": {
        target:
          process.env.VUE_APP_TOWNSQUARE_IMAGE_PROXY || "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
};
