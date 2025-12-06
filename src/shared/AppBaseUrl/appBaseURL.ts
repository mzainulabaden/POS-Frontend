export let newBaseUrl = "Live";

const backendUrl = "http://10.20.1.227:8000/";

const baseUrlMap = {
  Dev: backendUrl,
  Live: backendUrl,
  Testing: backendUrl,
};

newBaseUrl = baseUrlMap[newBaseUrl] || backendUrl;
