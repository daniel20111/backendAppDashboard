const { Schema, model } = require("mongoose");

const HistorialSchema = Schema({
	fecha: Date,
	cantidad: Number,
});

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
	historial: [HistorialSchema],
});

StockSchema.methods.toJSON = function () {
	const { __v, historial, ...data } = this.toObject();
	return data;
};

module.exports = model("Stock", StockSchema);
