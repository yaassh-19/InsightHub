import { Link, Navigate } from "react-router-dom";
import InputBox from "../components/input.component";
import googleIcon from "../imgs/google.png"
import AnimationWrapper from "../common/page-animation";
import { useContext,useRef } from "react";
import {Toaster,toast} from "react-hot-toast"
import axios from "axios";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";


const UserAuthForm = ({type}) => {

    // const authForm = useRef();
    let { userAuth : {access_token} ,setUserAuth} = useContext(UserContext)
    // console.log(access_token)

    const userAuthThroughServer = (serverRoute,formData) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute,formData)
        .then(({data}) => {
            storeInSession("user",JSON.stringify(data))
            setUserAuth(data)
            // console.log(sessionStorage)
        })
        .catch(({response}) => {
            toast.error(response.data.error);
        })

    }
    
    const handleSubmit = (e)=>{
        e.preventDefault();

        let serverRoute = type === "sign-in" ? "/signin" : "/signup";

        let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
        let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password
        let form = new FormData(formElement);
        let formData = {}

        for(let [key,value] of form.entries()){
            formData[key] = value;
        }
        console.log(formData);

        let {fullname,email,password} = formData;

        // form validation
        if (fullname){
            if(fullname.length < 3){
                return toast.error("Fullname must be atleast 4 letters long");
            }

        }
        
        if (!email.length){
            return toast.error("Enter email")
        }
        if(!emailRegex.test(email)){
            return toast.error("Invalid Email")
        }
        if (!passwordRegex.test(password)){
            return toast.error("Password must be 6 to 20 characters long with a numeric ,a uppercase and a lowercase character")
        }

        userAuthThroughServer(serverRoute,formData);
    }
    const handleGoogleAuth = (e) =>{
        e.preventDefault();
        authWithGoogle().then(user =>{
            let serverRoute = "/google-auth";
            let formData = {
                access_token : user.accessToken
            }
            userAuthThroughServer(serverRoute,formData);
        })
        .catch(err =>{
            toast.error("Trouble Login With Google");
            return console.log(err);
        })
    }
    return (
        access_token ?
        <Navigate to="/"/>
        :
        <AnimationWrapper keyValue={type}>
            <section className="h-cover flex items-center justify-center">
                <Toaster />
                <form id="formElement" className="w-[80%] max-w-[400px]">
                    <h1 className="text-3xl font-gelasio capitalize text-center mb-24">
                        {type == "sign-in" ? "Welcome back" : "Join us today"}
                    </h1>
                    {
                        type != "sign-in" ?
                        <InputBox 
                        name="fullname"
                        type="text"
                        placeholder="Full-Name"
                        icon = "fi-rr-user"/>
                        :""
                    }
                    <InputBox 
                        name="email"
                        type="email"
                        placeholder="Email"
                        icon = "fi-rr-envelope"
                    />
                    <InputBox 
                        name="password"
                        type="password"
                        placeholder="Password"
                        icon = "fi-rr-key"
                    />
                    <button className="btn-dark center mt-10" type="submit" onClick={handleSubmit}>
                        {type.replace("-"," ")}

                    </button>

                    <div className=" relative w-full flex items-center gap-2 my-10 opacity-20 uppercase text-black font-bold">
                        <hr className="w-1/2 border-black"/>
                        <p>or</p>
                        <hr className="w-1/2 border-black"/>
                    </div>

                    <button className="btn-dark flex items-center justify-center gap-4 w-[90%] center" onClick={handleGoogleAuth}>
                        <img src={googleIcon} alt="" className="w-5"/>
                        continue with google
                    </button>

                    {
                        type == "sign-in" ?
                        <p className=" mt-6 text-dark-grey text-xl text-center">
                            Don't have an account ?
                            <Link to="/signup" className=" underline text-black text-xl ml-1">
                            Join us today.
                            </Link>
                        </p>
                        :
                        <p className=" mt-6 text-dark-grey text-xl text-center">
                            Already a member ?
                            <Link to="/signin" className=" underline text-black text-xl ml-1">
                            Sign in here.
                            </Link>
                        </p>

                    }


                </form>
            </section>

        </AnimationWrapper>
        

    )
}

export default UserAuthForm;