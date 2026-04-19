exports.handler = async () => {
  const payload = {
    blog: {
      clientId: process.env.CLIENT_ID_BLOG || "",
      redirectUri: process.env.REDIRECT_URI_BLOG || ""
    },
    forum: {
      clientId: process.env.CLIENT_ID_FORUM || "",
      redirectUri: process.env.REDIRECT_URI_FORUM || ""
    },
    clipboard: {
      clientId: process.env.CLIENT_ID_CLIPBOARD || "",
      redirectUri: process.env.REDIRECT_URI_CLIPBOARD || ""
    }
  };
  return { statusCode: 200, body: JSON.stringify(payload) };
};
