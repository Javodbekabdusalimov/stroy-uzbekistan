const Comment = require('../models/Comment');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');

const updateProductRating = async (productId) => {
  const stats = await Comment.aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewsCount: stats[0].count
    });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { productId, rating, text, pros, cons, orderId } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) return sendError(res, 'Mahsulot topilmadi', 404);

    const existingComment = await Comment.findOne({ product: productId, user: req.user._id });
    if (existingComment) {
      return sendError(res, 'Siz bu mahsulotga allaqachon sharh qoldirdingiz', 400);
    }

    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        buyer: req.user._id,
        'items.product': productId,
        status: 'delivered'
      });
      isVerifiedPurchase = !!order;
    }

    const commentData = {
      product: productId,
      store: product.store,
      user: req.user._id,
      rating,
      text,
      pros,
      cons,
      isVerifiedPurchase,
      order: orderId || null
    };

    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      commentData.images = req.uploadedFiles;
    }

    const comment = await Comment.create(commentData);
    await updateProductRating(productId);

    const populated = await Comment.findById(comment._id).populate('user', 'name avatar');

    return sendSuccess(res, 'Sharh muvaffaqiyatli qo\'shildi', { comment: populated }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'Siz bu mahsulotga allaqachon sharh qoldirdingiz', 400);
    }
    return sendError(res, error.message || 'Sharh qo\'shishda xatolik', 500);
  }
};

exports.getProductComments = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20, rating, sortBy = '-createdAt' } = req.query;

    const filter = { product: productId, isApproved: true };
    if (rating) filter.rating = parseInt(rating);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Comment.countDocuments(filter);

    const comments = await Comment.find(filter)
      .populate('user', 'name avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const stats = await Comment.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(productId), isApproved: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach((s) => { ratingBreakdown[s._id] = s.count; });

    return sendPaginated(res, 'Sharhlar ro\'yxati', comments, {
      ...paginate(page, limit, total),
      ratingBreakdown
    });
  } catch (error) {
    return sendError(res, 'Sharhlarni olishda xatolik', 500);
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findOne({ _id: id, user: req.user._id });

    if (!comment) return sendError(res, 'Sharh topilmadi', 404);

    const { rating, text, pros, cons } = req.body;
    if (rating) comment.rating = rating;
    if (text !== undefined) comment.text = text;
    if (pros !== undefined) comment.pros = pros;
    if (cons !== undefined) comment.cons = cons;
    if (req.uploadedFiles) comment.images = req.uploadedFiles;

    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await updateProductRating(comment.product);

    return sendSuccess(res, 'Sharh yangilandi', { comment });
  } catch (error) {
    return sendError(res, 'Sharh yangilashda xatolik', 500);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);

    if (!comment) return sendError(res, 'Sharh topilmadi', 404);

    const isOwner = comment.user.toString() === req.user._id.toString() || req.user.role === 'admin';
    if (!isOwner) return sendError(res, 'Ruxsat yo\'q', 403);

    const productId = comment.product;
    await Comment.findByIdAndDelete(id);
    await updateProductRating(productId);

    return sendSuccess(res, 'Sharh o\'chirildi');
  } catch (error) {
    return sendError(res, 'Sharh o\'chirishda xatolik', 500);
  }
};

exports.likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);

    if (!comment) return sendError(res, 'Sharh topilmadi', 404);

    const userId = req.user._id.toString();
    const isLiked = comment.likedBy.map((u) => u.toString()).includes(userId);

    if (isLiked) {
      comment.likedBy = comment.likedBy.filter((u) => u.toString() !== userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(req.user._id);
      comment.likes += 1;
    }

    await comment.save();

    return sendSuccess(res, isLiked ? 'Like olib tashlandi' : 'Like qo\'shildi', {
      likes: comment.likes,
      isLiked: !isLiked
    });
  } catch (error) {
    return sendError(res, 'Like qo\'yishda xatolik', 500);
  }
};

exports.replyToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const comment = await Comment.findById(id).populate('product');

    if (!comment) return sendError(res, 'Sharh topilmadi', 404);

    const Store = require('../models/Store');
    const store = await Store.findOne({ owner: req.user._id });

    if (req.user.role !== 'admin' && (!store || store._id.toString() !== comment.product.store.toString())) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    comment.sellerReply = { text, repliedAt: new Date() };
    await comment.save();

    return sendSuccess(res, 'Javob qo\'shildi', { comment });
  } catch (error) {
    return sendError(res, 'Javob qo\'shishda xatolik', 500);
  }
};
