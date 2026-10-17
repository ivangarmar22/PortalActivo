// Worker mínimo delante de los recursos estáticos: workers.dev no tiene «Always Use HTTPS»,
// así que la redirección a HTTPS se hace aquí. El resto lo sirve el binding ASSETS.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      return Response.redirect(url.toString(), 301)
    }
    return env.ASSETS.fetch(request)
  },
}
