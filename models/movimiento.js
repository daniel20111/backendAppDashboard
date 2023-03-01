const { Schema, model } = require("mongoose");
const moment = require("moment");

const MovimientoSchema = Schema({
  estado: {
    type: Boolean,
    default: true,
    required: true,
  },
  usuario: {
    type: Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  cantidad: {
    type: Number,
    default: 0,
  },
  movimiento: {
    type: String,
    default: 0,
  },
  producto: {
    type: Schema.Types.ObjectId,
    ref: "Producto",
    required: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

MovimientoSchema.methods.toJSON = function () {
  const { __v, estado, ...data } = this.toObject();
  return data;
};

module.exports = model("Movimiento", MovimientoSchema);
