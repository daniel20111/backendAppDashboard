const { Schema, model } = require("mongoose");

const ProductoSchema = Schema({
	nombre: {
		type: String,
		required: [true, "El nombre es obligatorio"],
		unique: true,
		validate: {
			validator: function (v) {
				return v.length <= 15;
			},
			message: "El nombre no puede tener más de 15 caracteres",
		},
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
	categoria: {
		type: Schema.Types.ObjectId,
		ref: "Categoria",
		required: true,
	},
	img: {
		type: String,
	},
	precioCaja: {
		type: Number,
		required: [true, "El precio de la caja es obligatorio"],
	},
	precioPorUnidad: {
		type: Number,
		required: [true, "El precio por unidad es obligatorio"],
	},
	disponible: { type: Boolean, default: true },
	color: {
		type: String,
		enum: [
			"Sin determinar",
			"Rojo",
			"Naranja",
			"Amarillo",
			"Verde",
			"Azul",
			"Marrón",
			"Gris",
			"Blanco",
			"Negro",
		],
		default: "Sin determinar",
	},
});

ProductoSchema.methods.toJSON = function () {
	const { __v, estado, ...data } = this.toObject();
	return data;
};
module.exports = model("Producto", ProductoSchema);
