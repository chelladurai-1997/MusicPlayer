const errorHandler = (error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ error: "Something went wrong!" });
};

export default errorHandler;
