const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/response');

exports.getCategories = async (req, res) => {
  try {
    const { parent, tree } = req.query;

    if (tree === 'true') {
      const roots = await Category.find({ parent: null, isActive: true })
        .populate({ path: 'children', match: { isActive: true }, select: 'name nameUz icon image slug order productCount' })
        .sort('order')
        .lean();
      return sendSuccess(res, 'Kategoriyalar daraxti', { categories: roots });
    }

    const filter = { isActive: true };
    if (parent) filter.parent = parent === 'null' ? null : parent;

    const categories = await Category.find(filter)
      .populate('parent', 'name')
      .sort('order')
      .lean();

    return sendSuccess(res, 'Kategoriyalar ro\'yxati', { categories });
  } catch (error) {
    return sendError(res, 'Kategoriyalarni olishda xatolik', 500);
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const category = await Category.findOne({ ...query, isActive: true })
      .populate('parent', 'name nameUz slug')
      .populate({ path: 'children', match: { isActive: true } })
      .lean();

    if (!category) return sendError(res, 'Kategoriya topilmadi', 404);

    return sendSuccess(res, 'Kategoriya ma\'lumotlari', { category });
  } catch (error) {
    return sendError(res, 'Kategoriya ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const categoryData = { ...req.body };
    if (req.uploadedFile) categoryData.image = req.uploadedFile;

    const category = await Category.create(categoryData);
    return sendSuccess(res, 'Kategoriya yaratildi', { category }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Kategoriya yaratishda xatolik', 500);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (req.uploadedFile) updates.image = req.uploadedFile;

    const category = await Category.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!category) return sendError(res, 'Kategoriya topilmadi', 404);

    return sendSuccess(res, 'Kategoriya yangilandi', { category });
  } catch (error) {
    return sendError(res, 'Kategoriya yangilashda xatolik', 500);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndUpdate(id, { isActive: false });
    return sendSuccess(res, 'Kategoriya o\'chirildi');
  } catch (error) {
    return sendError(res, 'Kategoriya o\'chirishda xatolik', 500);
  }
};
