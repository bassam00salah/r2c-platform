const admin = require("firebase-admin");
admin.initializeApp();

const { createOrder, updateOrderStatus, completeOrderByQR } = require("./handlers/orders");
const { autoCancelOrder, processCancelOrder, cancelOrderOnTimeout } = require("./handlers/tasks");
const { createBranchUser, createOwnerUser, deleteBranch, deleteOwner } = require("./handlers/admin");

exports.createOrder = createOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.completeOrderByQR = completeOrderByQR;

exports.autoCancelOrder = autoCancelOrder;
exports.processCancelOrder = processCancelOrder;
exports.cancelOrderOnTimeout = cancelOrderOnTimeout;

exports.createBranchUser = createBranchUser;
exports.createOwnerUser = createOwnerUser;
exports.deleteBranch = deleteBranch;
exports.deleteOwner = deleteOwner;
