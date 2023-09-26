const { Schema, model } = require("mongoose");

const StockSchema = Schema({
	cantidadCajas: {
		type: Number,
		default: 0,
		required: true,
	},
	cantidadPiezas: {
		type: Number,
		default: 0,
		required: true,
	},
	puntoReorden: {
		type: Number,
		default: 0,
	},
	eoq: {
		type: Number,
		default: 0,
	},
	nivelSegurdad: {
		type: Number,
		default: 0,
	},
	probAgotamiento: {
		type: Number,
		default: 0,
	},
	reservadoCajas: { type: Number, default: 0 },
	reservadoPiezas: { type: Number, default: 0 },
	entranteCajas: { type: Number, default: 0 },
	entrantePiezas: { type: Number, default: 0 },
	producto: {
		type: Schema.Types.ObjectId,
		ref: "Producto",
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
	historial: [
		{
			fecha: Date,
			cantidadCajas: Number,
			cantidadPiezas: Number,
		},
	],
	estadisticasMensuales: [
		{
			year: Number,
			month: Number,
			totalCajas: Number,
		},
	],
});

StockSchema.methods.toJSON = function () {
	const { __v, historial, ...data } = this.toObject();
	return data;
};

module.exports = model("Stock", StockSchema);
