import axios from 'axios';

const API_URL = 'http://localhost:1337/api/categories';

export async function getCategories() {
    try{
        const res = await axios.get(API_URL);
        return res.data.data;
    } catch (error) {
        console.log(error);
        return [];
    }
}
