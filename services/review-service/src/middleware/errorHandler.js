export default function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.status || (error.code === "23505" ? 409 : 500);
  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}
