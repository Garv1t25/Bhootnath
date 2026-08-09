import { Customer } from "../models/Customer.model.js";

const normalizeMobile = (mobile) => {
  let digits = String(mobile ?? "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
};

const getDuplicateCustomer = async (mobile, excludeId) => {
  if (!mobile) {
    return null;
  }

  const variants = new Set([mobile, `91${mobile}`]);
  const filter = { mobile: { $in: [...variants] } };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Customer.findOne(filter).select("name plan planType mobile");
};

export const getCustomers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search ?? "").trim();
    const filter = String(req.query.filter ?? "all").trim();

    const query = buildCustomerQuery({ search, filter });

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      customers,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const buildCustomerQuery = ({ search, filter }) => {
  const query = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { mobile: { $regex: escaped } },
    ];
  }

  if (filter && filter !== "all") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayInMs = 24 * 60 * 60 * 1000;

    switch (filter) {
      case "pending":
        query.$expr = {
          $lt: [{ $ifNull: ["$paidAmount", "$amount"] }, "$amount"],
        };
        break;
      case "inactive":
        query.endDate = { $lt: now };
        break;
      case "expiring":
        query.endDate = { $gte: today, $lt: new Date(today.getTime() + 5 * dayInMs) };
        break;
      default:
        query.planType = filter;
    }
  }

  return query;
};

const validateCustomer = (body) => {
  const name = String(body.name ?? "").trim();
  if (!name) {
    return "Name is required.";
  }
  if (name.length > 25) {
    return "Name must not be longer than 25 characters.";
  }

  const mobile = normalizeMobile(body.mobile);
  if (mobile.length !== 10) {
    return "Mobile number must be exactly 10 digits.";
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be a number greater than zero.";
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime())) {
    return "Start date is invalid.";
  }
  if (Number.isNaN(endDate.getTime())) {
    return "End date is invalid.";
  }
  if (endDate < startDate) {
    return "End date must be on or after the start date.";
  }

  const notes = String(body.notes ?? "");
  if (notes.length > 500) {
    return "Notes must not be longer than 500 characters.";
  }

  return null;
};

export const getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayInMs = 24 * 60 * 60 * 1000;

    const [result] = await Customer.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [
            { $match: { endDate: { $gte: today } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
                pending: {
                  $sum: {
                    $max: [
                      { $subtract: ["$amount", { $ifNull: ["$paidAmount", "$amount"] }] },
                      0,
                    ],
                  },
                },
                byPlan: {
                  $push: {
                    plan: {
                      $cond: [
                        { $eq: [{ $trim: { input: { $ifNull: ["$plan", ""] } } }, ""] },
                        "Unspecified plan",
                        { $trim: { input: { $ifNull: ["$plan", ""] } } },
                      ],
                    },
                    amount: "$amount",
                  },
                },
              },
            },
          ],
          expired: [
            { $match: { endDate: { $lt: today } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                pending: {
                  $sum: {
                    $max: [
                      { $subtract: ["$amount", { $ifNull: ["$paidAmount", "$amount"] }] },
                      0,
                    ],
                  },
                },
              },
            },
          ],
          expiringSoon: [
            { $match: { endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * dayInMs) } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const activeStats = result.active[0];
    const expiredStats = result.expired[0];
    const revenueByPlan = {};

    for (const { plan, amount } of activeStats?.byPlan ?? []) {
      revenueByPlan[plan] = revenueByPlan[plan] || { subscriptions: 0, totalAmount: 0 };
      revenueByPlan[plan].subscriptions += 1;
      revenueByPlan[plan].totalAmount += amount;
    }

    res.status(200).json({
      stats: {
        total: result.total[0]?.count ?? 0,
        active: activeStats?.count ?? 0,
        expired: expiredStats?.count ?? 0,
        expiringSoon: result.expiringSoon[0]?.count ?? 0,
        activeRevenue: activeStats?.revenue ?? 0,
        totalPending: (activeStats?.pending ?? 0) + (expiredStats?.pending ?? 0),
        planRevenue: Object.entries(revenueByPlan).sort(
          ([, firstPlan], [, secondPlan]) => secondPlan.totalAmount - firstPlan.totalAmount
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCustomersExport = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addCustomer = async (req, res) => {
  try {
    const body = req.body || {};
    const mobile = normalizeMobile(body.mobile);

    const validationError = validateCustomer(body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await getDuplicateCustomer(mobile);
    if (duplicate) {
      return res.status(409).json({
        message: `This mobile number is already used by ${duplicate.name} (${duplicate.plan}).`,
        duplicate: duplicate,
      });
    }

    const newCustomer = new Customer({ ...body, mobile });
    const savedCustomer = await newCustomer.save();
    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: "Error adding customer", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const mobile = normalizeMobile(body.mobile);

    const validationError = validateCustomer(body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await getDuplicateCustomer(mobile, id);
    if (duplicate) {
      return res.status(409).json({
        message: `This mobile number is already used by ${duplicate.name} (${duplicate.plan}).`,
        duplicate: duplicate,
      });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, { ...body, mobile }, { new: true });
    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: "Error updating customer", error: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await Customer.findByIdAndDelete(id);
    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting customer", error: error.message });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than zero." });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const paymentDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ message: "Payment date is invalid." });
    }

    customer.payments.push({ amount, date: paymentDate });
    customer.paidAmount = Math.min(customer.amount, (customer.paidAmount || 0) + amount);
    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: "Error recording payment", error: error.message });
  }
};
