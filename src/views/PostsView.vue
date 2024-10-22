<template setup>
    <div>
      <h1>All Posts</h1>
      <ul>
        <li v-for="post in posts" :key="post._sys.filename">
          <router-link :to="`/posts/${post._sys.filename}`">{{ post.title }}</router-link>
        </li>
      </ul>
    </div>
  </template>
  
  
  <script>
  import { client } from '../../tina/__generated__/client';
  
  export default {
    data() {
      return {
        posts: [],
      };
    },
    async created() {
      try {
        // Fetch data using the TinaCMS client
        const { data } = await client.queries.postConnection();
        this.posts = data.postConnection.edges.map(edge => edge.node);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    },
  };
  </script>
  