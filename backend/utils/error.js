export const render400Error = (res, message) => {
  return res.status(400).json({ error: message, status: false });
};

export const render401Error = (res, message) => {
  return res.status(401).json({ error: message, status: false });
};

export const render404Error = (res, message) => {
  return res.status(404).json({ error: message, status: false });
};

export const render500Error = (res, message = "Something went wrong!") => {
  return res.status(500).json({ error: message, status: false });
};
