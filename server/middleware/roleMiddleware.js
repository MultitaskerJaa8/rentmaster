/**
 * Usage: router.post('/', protect, authorize('admin', 'owner'), handler)
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized'));
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`Access denied. This action requires role: ${roles.join(' / ')}`)
      );
    }
    next();
  };

module.exports = { authorize };