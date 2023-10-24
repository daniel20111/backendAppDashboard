const { Schema, model } = require("mongoose");

const CategoriaSchema = Schema({
	nombre: {
		type: String,
	},
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
	material: {
		type: String,
		required: [true, "El material es obligatorio"],
		enum: ["ceramica", "porcelanato"],
	},
	dimensiones: {
		type: String,
		required: [true, "Las dimensiones son obligatorias"],
		enum: ["60x60cm", "30x30cm", "45x45cm", "30x60cm", "60x120cm"],
	},
	acabado: {
		type: String,
		required: [true, "El acabado es obligatorio"],
		enum: ["brillante", "mate", "texturizado"],
	},
	precioCaja: {
		type: Number,
		required: [true, "El precio de la caja es obligatorio"],
	},
	unidadesPorCaja: {
		type: Number,
		required: [true, "El número de unidades por caja es obligatorio"],
	},
	precioPorUnidad: {
		type: Number,
		required: [true, "El precio por unidad es obligatorio"],
	},
});

CategoriaSchema.methods.toJSON = function () {
	const { __v, estado, ...data } = this.toObject();
	return data;
};

module.exports = model("Categoria", CategoriaSchema);
