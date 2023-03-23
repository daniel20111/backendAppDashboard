const { Schema, model } = require("mongoose");

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
	movimiento: {
		type: String,
		required: true,
	},
	verificado_por: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
	},
	fecha_verificacion: {
		type: Date,
	},
	verificacion: {
		type: String,
		required: true,
		default: "EN ESPERA",
	},
	stock: {
		type: Schema.Types.ObjectId,
		ref: "Stock",
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
