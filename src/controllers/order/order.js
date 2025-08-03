import Order from "../../models/order.js";
import Branch from "../../models/branch.js";
import { Customer, DeliveryPartner } from "../../models/user.js";

export const createOrder = async (req, reply) => {
  try {
    const { userId } = req.user;
    console.log('[createOrder] User ID from token:', userId);
    if (!userId) {
      console.log('[createOrder] No userId in token');
      return reply.status(401).send({ message: "Unauthorized: No user ID found in token" });
    }

    const { items, branch, totalPrice, deliveryLocation } = req.body;
    console.log('[createOrder] Request body:', { items, branch, totalPrice, deliveryLocation });
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[createOrder] Invalid items');
      return reply.status(400).send({ message: "Items are required and must be a non-empty array" });
    }
    if (!branch) {
      console.log('[createOrder] No branch provided');
      return reply.status(400).send({ message: "Branch ID is required" });
    }
    if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
      console.log('[createOrder] Invalid totalPrice:', totalPrice);
      return reply.status(400).send({ message: "Valid total price is required" });
    }

    const customerData = await Customer.findById(userId);
    if (!customerData) {
      console.log('[createOrder] Customer not found:', userId);
      return reply.status(404).send({ message: "Customer not found" });
    }

    const branchData = await Branch.findById(branch);
    if (!branchData) {
      console.log('[createOrder] Branch not found:', branch);
      return reply.status(404).send({ message: "Branch not found" });
    }

    const useLiveLocation = customerData.liveLocation && customerData.liveLocation.latitude && customerData.liveLocation.longitude;
    const finalDeliveryLocation = useLiveLocation
      ? {
          latitude: customerData.liveLocation.latitude,
          longitude: customerData.liveLocation.longitude,
          address: customerData.address || `Lat: ${customerData.liveLocation.latitude}, Lon: ${customerData.liveLocation.longitude}`,
        }
      : {
          latitude: deliveryLocation?.latitude || 0,
          longitude: deliveryLocation?.longitude || 0,
          address: deliveryLocation?.address || `Lat: ${deliveryLocation?.latitude || 0}, Lon: ${deliveryLocation?.longitude || 0}`,
        };
    console.log('[createOrder] Delivery location:', finalDeliveryLocation);

    const newOrder = new Order({
      customer: userId,
      items: items.map((item) => ({
        id: item.id,
        item: item.item,
        count: item.count,
      })),
      branch,
      totalPrice,
      deliveryLocation: finalDeliveryLocation,
      pickupLocation: {
        latitude: branchData.location?.latitude || 0,
        longitude: branchData.location?.longitude || 0,
        address: branchData.address || "No address available",
      },
    });

    const savedOrder = await newOrder.save();
    console.log('[createOrder] Order saved:', {
      orderId: savedOrder.orderId,
      customerId: userId,
      items: savedOrder.items,
      hasItems: Array.isArray(savedOrder.items) ? 'Array' : typeof savedOrder.items,
    });

    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('customer', 'name phone')
      .populate('items.item', 'name price')
      .populate('branch', 'name address');
    return reply.status(201).send(populatedOrder);
  } catch (error) {
    console.error('[createOrder] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return reply.status(500).send({ message: "Failed to create order", error: error.message });
  }
};

export const confirmOrder = async (req, reply) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.user;
    const { deliveryPersonLocation } = req.body;
    console.log('[confirmOrder] Request:', { orderId, userId, deliveryPersonLocation });

    const deliveryPerson = await DeliveryPartner.findById(userId);
    if (!deliveryPerson) {
      console.log('[confirmOrder] Delivery Person not found:', userId);
      return reply.status(404).send({ message: "Delivery Person not found" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('[confirmOrder] Order not found:', orderId);
      return reply.status(404).send({ message: "Order not found" });
    }

    if (order.status !== "available") {
      console.log('[confirmOrder] Order not available:', order.status);
      return reply.status(400).send({ message: "Order is not available" });
    }
    order.status = "confirmed";
    order.deliveryPartner = userId;
    order.deliveryPersonLocation = {
      latitude: deliveryPersonLocation?.latitude || 0,
      longitude: deliveryPersonLocation?.longitude || 0,
      address: deliveryPersonLocation?.address || "",
    };

    await order.save();
    console.log('[confirmOrder] Order confirmed:', {
      orderId: order.orderId,
      deliveryPartnerId: userId,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('items.item', 'name price')
      .populate('branch', 'name address');
    req.server.io.to(orderId).emit("orderConfirmed", populatedOrder);
    return reply.send(populatedOrder);
  } catch (error) {
    console.error('[confirmOrder] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return reply.status(500).send({ message: "Failed to confirm order", error: error.message });
  }
};

export const updateOrderStatus = async (req, reply) => {
  try {
    const { orderId } = req.params;
    const { status, deliveryPersonLocation } = req.body;
    const { userId } = req.user;
    console.log('[updateOrderStatus] Request:', { orderId, status, userId, deliveryPersonLocation });

    const deliveryPerson = await DeliveryPartner.findById(userId);
    if (!deliveryPerson) {
      console.log('[updateOrderStatus] Delivery Person not found:', userId);
      return reply.status(404).send({ message: "Delivery Person not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.log('[updateOrderStatus] Order not found:', orderId);
      return reply.status(404).send({ message: "Order not found" });
    }

    if (["cancelled", "delivered"].includes(order.status)) {
      console.log('[updateOrderStatus] Order cannot be updated:', order.status);
      return reply.status(400).send({ message: "Order cannot be updated" });
    }

    if (order.deliveryPartner?.toString() !== userId) {
      console.log('[updateOrderStatus] Unauthorized:', {
        orderDeliveryPartner: order.deliveryPartner,
        userId,
      });
      return reply.status(403).send({ message: "Unauthorized" });
    }
    order.status = status;
    order.deliveryPersonLocation = {
      latitude: deliveryPersonLocation?.latitude || 0,
      longitude: deliveryPersonLocation?.longitude || 0,
      address: deliveryPersonLocation?.address || "",
    };
    await order.save();
    console.log('[updateOrderStatus] Order updated:', {
      orderId: order.orderId,
      newStatus: status,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('items.item', 'name price')
      .populate('branch', 'name address');
    req.server.io.to(orderId).emit("LiveTrackingUpdates", populatedOrder);
    return reply.send(populatedOrder);
  } catch (error) {
    console.error('[updateOrderStatus] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return reply.status(500).send({ message: "Failed to update order status", error: error.message });
  }
};

export const getOrders = async (req, reply) => {
  try {
    const { status, customerId, deliveryPartnerId, branchId } = req.query;
    const { userId, role } = req.user;
    console.log('[getOrders] Request:', { status, customerId, deliveryPartnerId, branchId, userId, role });

    let query = {};
    if (role === 'Customer' && customerId && customerId === userId) {
      query.customer = customerId;
    } else if (role === 'Delivery') {
      query.status = status || 'available';
      if (deliveryPartnerId && deliveryPartnerId === userId) {
        query.deliveryPartner = deliveryPartnerId;
      }
      if (branchId) {
        query.branch = branchId;
      } else {
        console.warn('[getOrders] No branchId provided for Delivery role');
      }
    } else {
      console.warn('[getOrders] Invalid role or customerId:', { role, customerId, userId });
      return reply.status(400).send({ message: "Invalid role or customer ID" });
    }

    if (customerId && customerId !== userId) {
      console.warn('[getOrders] Customer ID mismatch:', {
        tokenUserId: userId,
        queryCustomerId: customerId,
        note: 'Order ORDR00001 has customerId=688e31d8af03898656e0e3b8.',
      });
    }

    console.log('[getOrders] Querying orders with:', query);
    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('items.item', 'name price')
      .populate('branch', 'name address')
      .populate('deliveryPartner', 'name phone');

    console.log('[getOrders] Orders found:', {
      count: orders.length,
      orders: orders.map(o => ({
        orderId: o.orderId,
        customerId: o.customer?._id,
        customerName: o.customer?.name,
        items: o.items,
        hasItems: Array.isArray(o.items) ? 'Array' : typeof o.items,
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        deliveryLocation: o.deliveryLocation,
        status: o.status,
        branch: o.branch?.name,
      })),
    });

    return reply.send(orders);
  } catch (error) {
    console.error('[getOrders] Error:', {
      message: error.message,
      stack: error.stack,
      query,
    });
    return reply.status(500).send({ message: 'Failed to retrieve orders', error: error.message });
  }
};

export const getOrderById = async (req, reply) => {
  try {
    const { orderId } = req.params;
    console.log('[getOrderById] Request:', { orderId });

    const order = await Order.findById(orderId)
      .populate('customer', 'name phone')
      .populate('items.item', 'name price')
      .populate('branch', 'name address')
      .populate('deliveryPartner', 'name phone');
    if (!order) {
      console.log('[getOrderById] Order not found:', orderId);
      return reply.status(404).send({ message: "Order not found" });
    }
    console.log('[getOrderById] Order found:', {
      orderId: order.orderId,
      items: o.items,
      hasItems: Array.isArray(o.items) ? 'Array' : typeof o.items,
      customerName: order.customer?.name,
      deliveryLocation: order.deliveryLocation,
    });
    return reply.send(order);
  } catch (error) {
    console.error('[getOrderById] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return reply.status(500).send({ message: "Failed to retrieve order", error: error.message });
  }
};
