export let newBaseUrl = "Live";

const backendUrl = "http://192.168.1.5:8000/";

const baseUrlMap = {
  Dev: backendUrl,
  Live: backendUrl,
  Testing: backendUrl,
};

newBaseUrl = baseUrlMap[newBaseUrl] || backendUrl;
