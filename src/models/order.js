import mongoose from 'mongoose';
import Counter from './counter.js';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  items: [
    {
      id: { type: String, required: true },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      count: { type: Number, required: true, min: 1 },
    },
  ],
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  totalPrice: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['available', 'confirmed', 'delivered', 'cancelled'],
    default: 'available',
  },
  deliveryLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, default: '' },
  },
  pickupLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner',
  },
  deliveryPersonLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.orderId = `ORDR${counter.seq.toString().padStart(5, '0')}`;
      console.log('[orderSchema] Generated orderId:', this.orderId);
    }
    if (!Array.isArray(this.items)) {
      console.warn('[orderSchema] Items is not an array for order:', {
        orderId: this.orderId,
        items: this.items,
      });
      this.items = [];
    } else if (this.items.length > 0) {
      for (const item of this.items) {
        if (!item.id || !item.item || !item.count) {
          console.warn('[orderSchema] Invalid item in order:', {
            orderId: this.orderId,
            item,
          });
          this.items = [];
          break;
        }
      }
    }
    if (!this.deliveryLocation.address && this.deliveryLocation.latitude && this.deliveryLocation.longitude) {
      this.deliveryLocation.address = `Lat: ${this.deliveryLocation.latitude}, Lon: ${this.deliveryLocation.longitude}`;
    }
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    console.error('[orderSchema] Pre-save error:', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
});

export default mongoose.model('Order', orderSchema);
