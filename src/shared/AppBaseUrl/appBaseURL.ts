export let newBaseUrl = "Live";

const baseUrlMap = {
  Dev: "http://192.168.10.11:8000/",
  Live: "http://192.168.10.11:8000/",
  Testing: "http://192.168.10.11:8000/",
};

newBaseUrl = baseUrlMap[newBaseUrl] || newBaseUrl;
