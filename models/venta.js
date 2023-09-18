const { Schema, model } = require("mongoose");

const VentaSchema = Schema({
	usuario: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
		required: true,
	},
	estado: {
		type: String,
		enum: ["Pendiente", "Pagado", "Entregado", "Anulado"],
		default: "Pendiente",
		required: true,
	},
	cotizacion: {
		type: Schema.Types.ObjectId,
		ref: "Cotizacion",
	},
	fecha_venta: {
		type: Date,
		default: Date.now,
		required: true,
	},
	movimientos: [
		{
			type: Schema.Types.ObjectId,
			ref: "Movimiento",
		},
	],
	facturado: {
		type: Boolean,
		default: false,
		required: true,
	},
	factura: {
		type: Schema.Types.ObjectId,
		ref: "Factura",
	},
});

VentaSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Venta", VentaSchema);
