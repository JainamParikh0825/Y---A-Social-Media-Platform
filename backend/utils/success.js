export const render200Success = (res, message, data) => {
  return res.status(200).json({ status: true, message, data });
};

export const render201Success = (res, message, data) => {
  return res.status(201).json({ status: true, message, data });
};
