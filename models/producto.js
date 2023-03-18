const { Schema, model } = require("mongoose");
const Jimp = require("jimp");

const ProductoSchema = Schema({
    nombre: {
        type: String,
        required: [true, "El nombre es obligatorio"],
        unique: true,
        validate: {
            validator: function (v) {
                return v.length <= 15;
            },
            message: "El nombre no puede tener más de 15 caracteres"
        }
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
    precio: {
        type: Number,
        default: 0,
    },
    categoria: {
        type: Schema.Types.ObjectId,
        ref: "Categoria",
        required: true,
    },
    img: {
        type: String,
    },
    disponible: { type: Boolean, default: true },
    color: {
        type: String,
        enum: [
            "sin determinar",
            "rojo",
            "naranja",
            "amarillo",
            "verde",
            "azul",
            "morado",
            "rosa",
            "beige",
            "marrón",
            "gris",
            "blanco",
            "negro",
        ],
        default: "sin determinar",
    },
});

ProductoSchema.methods.toJSON = function () {
    const { __v, estado, ...data } = this.toObject();
    return data;
};
module.exports = model("Producto", ProductoSchema);
