/**
 * tmdbService.js
 * 
 * Integración con la API de TMDb para el buscador de películas.
 */

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Busca una película por texto.
 * @param {string} query - Texto a buscar
 * @param {string} language - Idioma (default: es-MX)
 */
export async function searchMovies(query, language = 'es-MX') {
    if (!query || query.length < 2) return [];

    try {
        const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${language}&include_adult=false`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Error al conectar con TMDb');
        
        const data = await response.json();
        
        // Normalización básica de resultados
        return data.results.map(movie => ({
            tmdbId: movie.id,
            title: movie.title,
            originalTitle: movie.original_title,
            releaseDate: movie.release_date,
            overview: movie.overview,
            posterPath: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            backdropPath: movie.backdrop_path ? `${IMAGE_BASE_URL}${movie.backdrop_path}` : null,
            voteAverage: movie.vote_average
        }));
    } catch (error) {
        console.error('[tmdbService] Error searching movies:', error);
        throw error;
    }
}

/**
 * Obtiene detalles de una película (útil para fallback de idioma o más info).
 */
export async function getMovieDetails(tmdbId, language = 'es-MX') {
    try {
        const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=${language}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error fetching movie details');
        return await response.json();
    } catch (error) {
        console.error('[tmdbService] Error fetching details:', error);
        throw error;
    }
}
