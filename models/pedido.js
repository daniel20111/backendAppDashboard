//modelo para pedido de productos hacia proveedores
const { Schema, model } = require("mongoose");

const PedidoSchema = new Schema({
	proveedor: {
		type: Schema.Types.ObjectId,
		ref: "Proveedor",
		required: true,
	},
	creado_por: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
		required: true,
	},
	productoDetalles: [
		{
			producto: {
				type: Schema.Types.ObjectId,
				ref: "Producto",
				required: true,
			},
			cantidadCajas: {
				type: Number,
				default: 0,
				required: true,
			},
		},
	],
	movimientos: [
		{
			type: Schema.Types.ObjectId,
			ref: "Movimiento",
		},
	],

	fecha: {
		type: Date,
		default: Date.now,
		required: true,
	},
	pedido: {
		type: Boolean,
		required: true,
		default: false,
	},
	estado: {
		type: Boolean,
		default: true,
		required: true,
	},
});

PedidoSchema.method("toJSON", function () {
	const { __v, ...object } = this.toObject();
	return object;
});

module.exports = model("Pedido", PedidoSchema);
