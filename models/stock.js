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

// Middleware pre-save para guardar datos previos a la actualización en el historial
StockSchema.pre("updateOne", async function (next) {
  // Obtener el documento actual antes de la actualización
  const stock = await this.model.findOne(this.getQuery());

  // Crear un nuevo objeto con la fecha y cantidad actuales
  const historialItem = {
    fecha: stock.fecha,
    cantidad: stock.cantidad,
  };

  // Agregar el objeto historialItem al historial
  this._update.$push = { historial: historialItem };

  // Continuar con la actualización
  next();
});

StockSchema.methods.toJSON = function () {
  const { __v, historial, ...data } = this.toObject();
  return data;
};

module.exports = model("Stock", StockSchema);