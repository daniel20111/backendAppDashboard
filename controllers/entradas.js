const { response } = require("express");
const { Movimiento } = require("../models");

const obtenerEntradas = async (req, res = response) => {
  //const { limite = 10, desde = 0 } = req.query;
  const query = { estado: true, movimiento: 'Entrada' };

  const [total, entradas] = await Promise.all([
    Movimiento.countDocuments(query),
    Movimiento.find(query)
      .sort('-fecha')
      .populate("usuario", "nombre")
      .populate("producto", "nombre"),
    //.skip(Number(desde))
    //.limit(Number(limite)),
  ]);

  res.json({
    total,
    entradas,
  });
};

const crearEntrada = async (req, res = response) => {
  const { estado, usuario, ...body } = req.body;

  // Generar la data a guardar
  const data = {
    ...body,
    usuario: req.usuario._id,
    cantidad: body.cantidad,
    movimiento: 'Entrada'
  };

  const entrada = new Movimiento(data);
    
  // Guardar DB
  const nuevaEntrada = await entrada.save();
  await nuevaEntrada
    .populate("usuario", "nombre")
    .populate("producto", "nombre")
    .execPopulate();

  res.status(201).json(nuevaEntrada);
};

/*const actualizarProducto = async (req, res = response) => {
  const { id } = req.params;
  const { estado, usuario, ...data } = req.body;

  data.usuario = req.usuario._id;

  const producto = await Producto.findByIdAndUpdate(id, data, { new: true });

  await producto
    .populate("usuario", "nombre")
    .populate("categoria", "nombre")
    .execPopulate();

  res.json(producto);
};

const borrarProducto = async (req, res = response) => {
  const { id } = req.params;
  const productoBorrado = await Producto.findByIdAndUpdate(
    id,
    { estado: false },
    { new: true }
  );

  res.json(productoBorrado);
};*/

module.exports = {
  obtenerEntradas,
  crearEntrada,
};
