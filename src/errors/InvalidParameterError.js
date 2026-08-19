/**
 * Classe de erro customizada para
 * parâmetros inválidos.
 */
export default class InvalidParameterError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidParameterError";
  }
}
