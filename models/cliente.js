const { Schema, model } = require("mongoose");

const ClienteSchema = Schema({
	nombre: {
		type: String,
		required: true,
	},
	apellido: {
		type: String,
		required: true,
	},
	NIT: {
		type: String,
		unique: true,
		sparse: true, // Permite valores únicos pero también acepta múltiples documentos sin este campo
	},
});

ClienteSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Cliente", ClienteSchema);
