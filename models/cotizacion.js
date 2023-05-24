const { Schema, model } = require("mongoose");
const moment = require("moment");

const ProductosSchema = Schema({
	producto: {
		type: Schema.Types.ObjectId,
		ref: "Producto",
	},
	cantidadCajas: Number,
	cantidadPiezas: Number,
	precioUnitarioPiezas: Number,
	precioUnitarioCajas: Number,
	precioTotalPiezas: Number,
	precioTotalCajas: Number,
	precioTotal: Number,
});

const CotizacionSchema = Schema({
	usuario: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
		required: true,
	},

	cliente: {
		type: String,
		required: true,
	},
	nit: {
		type: String,
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
	productos: [ProductosSchema],
	total: {
		type: Number,
		required: true,
	},
	estado: {
		type: Boolean,
		default: true,
		required: true,
	},
});

CotizacionSchema.methods.toJSON = function () {
	const { __v, historial, ...data } = this.toObject();
	return data;
};

module.exports = model("Cotizacion", CotizacionSchema);
