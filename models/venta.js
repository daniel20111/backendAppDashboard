const { Schema, model } = require("mongoose");

const ProductosVentaSchema = Schema({
	producto: {
		type: Schema.Types.ObjectId,
		ref: "Producto",
	},
	cantidad: Number,
	precio_unitario: Number,
	total: Number,
});

const VentaSchema = Schema({
	usuario: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
		required: true,
	},
	cliente: {
		type: Schema.Types.ObjectId,
		ref: "Cliente",
		required: true,
	},
	sucursal: {
		type: Schema.Types.ObjectId,
		ref: "Sucursal",
		required: true,
	},
	fecha: {
		type: Date,
		default: Date.now,
		required: true,
	},
	productos: [ProductosVentaSchema],
	total: {
		type: Number,
		required: true,
	},
	estado: {
		type: String,
		enum: ["Pendiente", "Pagado", "Cancelado"],
		default: "Pendiente",
		required: true,
	},
	cotizacion: {
		type: Schema.Types.ObjectId,
		ref: "Cotizacion",
	},
});

VentaSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Venta", VentaSchema);
