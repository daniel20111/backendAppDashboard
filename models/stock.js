const { Schema, model } = require("mongoose");
const moment = require("moment");

const HistorialSchema = Schema({
  fecha: Date,
  cantidad: Number
});

const StockSchema = Schema({
  cantidad: {
    type: Number,
    default: 0,
  },
  producto: {
    type: Schema.Types.ObjectId,
    ref: "Producto",
    required: true,
  },
  sucursal:{
    type: Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now,
    required: true,
  },
  historial: [HistorialSchema]
});

StockSchema.methods.toJSON = function () {
  const { __v, historial, ...data } = this.toObject();
  return data;
};

module.exports = model("Stock", StockSchema);