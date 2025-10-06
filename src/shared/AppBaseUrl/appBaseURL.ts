export let newBaseUrl = "Live";

const baseUrlMap = {
  Dev: "http://173.249.23.108:6063/",
  Live: "http://173.249.23.108:6063/",
  Testing: "http://173.249.23.108:6063/",
};

newBaseUrl = baseUrlMap[newBaseUrl] || newBaseUrl;
