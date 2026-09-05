import { Customer } from "../models/Customer.model.js";
import { CustomerActivity } from "../models/CustomerActivity.model.js";
import { CustomerActivityMigration } from "../models/CustomerActivityMigration.model.js";

const activityActions = new Set([
  "created",
  "updated",
  "renewed",
  "payment_recorded",
  "deleted",
  "baseline_import",
]);
const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
const activityMigrationKey = "initial-customer-activity-backfill-v1";
const currencyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const activityDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatCurrency = (amount) => `₹${currencyFormatter.format(Number(amount || 0))}`;

const getDueAmount = (customer) => {
  const amount = Number(customer?.amount || 0);
  const paidAmount = Number(customer?.paidAmount ?? amount);
  return Math.max(0, amount - paidAmount);
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatActivityDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "the selected date" : activityDateFormatter.format(date);
};

const getUpdateActivityMessage = (previousCustomer, customer) => {
  const messages = [];

  if (previousCustomer.name !== customer.name) {
    messages.push("Customer name updated");
  }
  if (previousCustomer.mobile !== customer.mobile) {
    messages.push("Mobile number updated");
  }
  if (previousCustomer.plan !== customer.plan) {
    messages.push(`Plan changed from ${previousCustomer.plan} to ${customer.plan}`);
  }
  if (previousCustomer.planType !== customer.planType) {
    messages.push("Meal plan type updated");
  }

  const previousAmount = Number(previousCustomer.amount || 0);
  const currentAmount = Number(customer.amount || 0);
  if (previousAmount !== currentAmount) {
    messages.push(`Plan amount changed from ${formatCurrency(previousAmount)} to ${formatCurrency(currentAmount)}`);
  }

  const previousDue = getDueAmount(previousCustomer);
  const currentDue = getDueAmount(customer);
  if (currentDue > previousDue) {
    messages.push(`${formatCurrency(currentDue - previousDue)} marked due`);
  } else if (currentDue < previousDue) {
    messages.push(`Due reduced by ${formatCurrency(previousDue - currentDue)}`);
  } else if (Number(previousCustomer.paidAmount ?? previousAmount) !== Number(customer.paidAmount ?? currentAmount)) {
    messages.push("Paid amount updated");
  }

  if (
    getDateKey(previousCustomer.startDate) !== getDateKey(customer.startDate) ||
    getDateKey(previousCustomer.endDate) !== getDateKey(customer.endDate)
  ) {
    messages.push(
      `Subscription dates changed to ${formatActivityDate(customer.startDate)} - ${formatActivityDate(customer.endDate)}`
    );
  }
  if (previousCustomer.notes !== customer.notes) {
    messages.push("Notes updated");
  }

  return messages.length > 0 ? `${messages.join(". ")}.` : "Customer details updated.";
};

const getActivityMessage = ({ customer, action, paymentAmount, previousCustomer }) => {
  const dueAmount = getDueAmount(customer);

  switch (action) {
    case "created":
      return dueAmount > 0
        ? `Customer added. ${formatCurrency(dueAmount)} marked due.`
        : "Customer added and marked fully paid.";
    case "updated":
      return getUpdateActivityMessage(previousCustomer, customer);
    case "renewed":
      return dueAmount > 0
        ? `Subscription renewed until ${formatActivityDate(customer.endDate)}. ${formatCurrency(dueAmount)} remains due.`
        : `Subscription renewed until ${formatActivityDate(customer.endDate)}.`;
    case "payment_recorded":
      return dueAmount > 0
        ? `Payment of ${formatCurrency(paymentAmount)} recorded. ${formatCurrency(dueAmount)} remains due.`
        : `Payment of ${formatCurrency(paymentAmount)} recorded. Plan is fully paid.`;
    case "deleted":
      return "Customer record deleted.";
    default:
      return "Existing customer record imported.";
  }
};

const logCustomerActivity = async ({ customer, action, paymentAmount, previousCustomer, req, customTimestamp }) => {
  try {
    await CustomerActivity.create({
      customerId: customer._id || customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      action,
      plan: customer.plan,
      planType: customer.planType,
      amount: customer.amount,
      paidAmount: customer.paidAmount ?? customer.amount,
      paymentAmount,
      startDate: customer.startDate,
      endDate: customer.endDate,
      notes: customer.notes || "",
      message: getActivityMessage({ customer, action, paymentAmount, previousCustomer }),
      timestamp: customTimestamp || new Date(),
      performedBy: req?.user?._id,
    });
  } catch (error) {
    console.error("Failed to log customer activity:", error.message);
  }
};

export const backfillCustomerActivities = async () => {
  try {
    const completedMigration = await CustomerActivityMigration.exists({ key: activityMigrationKey });
    if (completedMigration) return 0;

    const existingActivity = await CustomerActivity.exists();
    if (existingActivity) {
      await CustomerActivityMigration.updateOne(
        { key: activityMigrationKey },
        { $setOnInsert: { key: activityMigrationKey } },
        { upsert: true }
      );
      return 0;
    }

    const customers = await Customer.find();
    if (customers.length === 0) {
      await CustomerActivityMigration.updateOne(
        { key: activityMigrationKey },
        { $setOnInsert: { key: activityMigrationKey } },
        { upsert: true }
      );
      return 0;
    }

    const activitiesToCreate = [];
    for (const customer of customers) {
      activitiesToCreate.push({
        customerId: customer._id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        action: "baseline_import",
        plan: customer.plan,
        planType: customer.planType,
        amount: customer.amount,
        paidAmount: customer.paidAmount ?? customer.amount,
        startDate: customer.startDate,
        endDate: customer.endDate,
        notes: customer.notes || "",
        message: "Existing customer record imported from the previous data.",
        timestamp: customer.createdAt || new Date(),
      });

      for (const payment of customer.payments || []) {
        activitiesToCreate.push({
          customerId: customer._id,
          customerName: customer.name,
          customerMobile: customer.mobile,
          action: "payment_recorded",
          plan: customer.plan,
          planType: customer.planType,
          amount: customer.amount,
          paidAmount: customer.paidAmount ?? customer.amount,
          paymentAmount: payment.amount,
          startDate: customer.startDate,
          endDate: customer.endDate,
          notes: customer.notes || "",
          message: `Historical payment of ${formatCurrency(payment.amount)} imported from the previous data.`,
          timestamp: payment.date || customer.createdAt || new Date(),
        });
      }
    }

    await CustomerActivity.insertMany(activitiesToCreate);
    await CustomerActivityMigration.updateOne(
      { key: activityMigrationKey },
      { $setOnInsert: { key: activityMigrationKey } },
      { upsert: true }
    );
    return activitiesToCreate.length;
  } catch (error) {
    console.error("Failed to backfill customer activity baseline:", error.message);
    return 0;
  }
};

const normalizeMobile = (mobile) => {
  let digits = String(mobile ?? "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
};

const getHistoryFilters = (query) => {
  const parseDate = (value, label, endOfDay) => {
    if (!value) return null;

    const dateString = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return { error: `${label} must use YYYY-MM-DD format.` };
    }

    const date = new Date(`${dateString}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString) {
      return { error: `${label} is invalid.` };
    }

    return { date };
  };

  const start = parseDate(query.startDate, "Start date", false);
  const end = parseDate(query.endDate, "End date", true);
  if (start?.error || end?.error) {
    return { error: start?.error || end?.error };
  }

  const startDate = start?.date || new Date(Date.now() - ninetyDaysInMs);
  const endDate = end?.date || new Date();
  if (endDate < startDate) {
    return { error: "End date must be on or after the start date." };
  }

  const action = String(query.action ?? "all").trim();
  if (action !== "all" && !activityActions.has(action)) {
    return { error: "Activity type is invalid." };
  }

  return {
    startDate,
    endDate,
    action,
    search: String(query.search ?? "").trim(),
  };
};

const buildCustomerActivityQuery = ({ startDate, endDate, action, search }) => {
  const query = {
    timestamp: { $gte: startDate, $lte: endDate },
  };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { customerName: { $regex: escaped, $options: "i" } },
      { customerMobile: { $regex: escaped } },
    ];
  }

  if (action !== "all") {
    query.action = action;
  }

  return query;
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
    await logCustomerActivity({ customer: savedCustomer, action: "created", req });
    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: "Error adding customer", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { isRenewal, ...customerData } = body;
    const mobile = normalizeMobile(customerData.mobile);

    const validationError = validateCustomer(customerData);
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

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { ...customerData, mobile },
      { new: true }
    );
    await logCustomerActivity({
      customer: updatedCustomer,
      action: isRenewal === true ? "renewed" : "updated",
      previousCustomer: existingCustomer,
      req,
    });
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
    await logCustomerActivity({ customer: deletedCustomer, action: "deleted", req });
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

    await logCustomerActivity({
      customer,
      action: "payment_recorded",
      paymentAmount: amount,
      req,
      customTimestamp: paymentDate,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: "Error recording payment", error: error.message });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    await backfillCustomerActivities();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filters = getHistoryFilters(req.query);
    if (filters.error) {
      return res.status(400).json({ message: filters.error });
    }
    const query = buildCustomerActivityQuery(filters);

    const total = await CustomerActivity.countDocuments(query);
    const history = await CustomerActivity.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      history,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
      range: {
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCustomerHistoryExport = async (req, res) => {
  try {
    await backfillCustomerActivities();

    const filters = getHistoryFilters(req.query);
    if (filters.error) {
      return res.status(400).json({ message: filters.error });
    }
    const query = buildCustomerActivityQuery(filters);

    const history = await CustomerActivity.find(query).sort({ timestamp: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteCustomerHistoryActivity = async (req, res) => {
  try {
    const deletedActivity = await CustomerActivity.findByIdAndDelete(req.params.activityId);
    if (!deletedActivity) {
      return res.status(404).json({ message: "Activity log not found." });
    }

    res.status(200).json({ message: "Activity log deleted successfully." });
  } catch (error) {
    res.status(400).json({ message: "Unable to delete activity log.", error: error.message });
  }
};
