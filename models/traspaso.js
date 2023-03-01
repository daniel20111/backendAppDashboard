const { Schema, model } = require("mongoose");

const TraspasoSchema = Schema({
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
  origen:{
    type: Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true,
  },
  destino:{
    type: Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true,
  },
  entradas: [
    {
      type: Schema.Types.ObjectId,
      ref: "Entrada",
    },
  ],
  salidas: [
    {
      type: Schema.Types.ObjectId,
      ref: "Salida",
    },
  ],
});

TraspasoSchema.methods.toJSON = function () {
  const { __v, estado, ...data } = this.toObject();
  return data;
};

module.exports = model("Traspaso", TraspasoSchema);
