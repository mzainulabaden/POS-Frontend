export let newBaseUrl = "Live";

const baseUrlMap = {
  Dev: "http://ec2-16-171-113-162.eu-north-1.compute.amazonaws.com:8081/",
  Live: "http://ec2-16-171-113-162.eu-north-1.compute.amazonaws.com:8081/",
  Testing: "http://ec2-16-171-113-162.eu-north-1.compute.amazonaws.com:8081/",
};

newBaseUrl = baseUrlMap[newBaseUrl] || newBaseUrl;
