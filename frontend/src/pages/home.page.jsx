import { useEffect, useState } from "react";
import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import axios from "axios";
import Loader from "../components/loader.component";

const HomePage = () => {

    let [blogs, setBlog] = useState(null);

    const fetchLatestBlogs = () => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs")
        .then(({data}) =>{
            // console.log(data.blogs)
            setBlog(data.blogs)
        })
        .catch((err) => {
            console.log(err)
        })
    }

    useEffect(() => {
        fetchLatestBlogs();
    }, [])

    return (
        <AnimationWrapper>
            <section className="h-cover flex justify-center gap-10">
                {/* latest blogs */}
                <div className="w-full">
                    <InPageNavigation routes = {["home", "trending blogs"]} defaultHidden = {["trending blogs"]} children>
                        {/* <h1>Latest Blogs</h1>
                        <h1>Trending Blogs</h1> */}

                        <>
                            {
                                blogs == null ? <Loader /> : 
                                blogs.map((blog, i) => {
                                    return (<h1 key = {i}>{blog.title}</h1>) 
                                })
                            }
                        </>
                    </InPageNavigation>

                </div>

                {/* filters and trending blogs */}
                <div>

                </div>

            </section>

        </AnimationWrapper>
    )
}

export default HomePage;