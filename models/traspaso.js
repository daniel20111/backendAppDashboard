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
	entradas: [
		{
			type: Schema.Types.ObjectId,
			ref: "Movimiento",
		},
	],
	salidas: [
		{
			type: Schema.Types.ObjectId,
			ref: "Movimiento",
		},
	],
});

TraspasoSchema.methods.toJSON = function () {
	const { __v, estado, ...data } = this.toObject();
	return data;
};

module.exports = model("Traspaso", TraspasoSchema);
