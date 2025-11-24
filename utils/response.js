export const response = (res, statusCode, message, data = null) => {
  if (!res) {
    console.log("response is null");
    return;
  }
  const responseObj = {
    success: statusCode < 400,
    message,
    ...(data ? { data } : {}),
  };

  return res.status(statusCode).json(responseObj);
};
