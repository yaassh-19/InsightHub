import express from "express";
import mongoose from "mongoose";
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccountKey from "./quillio-blog-website-firebase-adminsdk-j3941-0faea13751.json" assert{type:"json"};
import {getAuth} from "firebase-admin/auth";
import aws from "aws-sdk";

import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js";
const server = express();
let PORT = 3000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
  });

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for passwordgergtergterger

server.use(express.json());
server.use(cors())

mongoose.connect(process.env.DB_LOCATION ,{
    autoIndex:true
});


const s3 = new aws.S3({
    region : 'ap-south-1',
    accessKeyId : process.env.AWS_ACCESS_KEY,
    secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY

})

const verifyJWT = (req, res, next)=>{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null){
        return res.status(401).json({ error : "No access token"})
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err){
            return res.status(403).json({error : "Access token is invalid"})
        }

        req.user = user.id
        next();
    })
}

const generateUploadURL = async () => {
    const date = new Date();
    const ImageName = `${nanoid}-${date.getTime()}.jpeg`;

    return await s3.getSignedUrl('putObject' , {
        Bucket : 'quillio-blogwebsite',
        Key : ImageName,
        Expires : 1000,
        ContentType : "image/jpeg"
    })
}

const formatDataToSend =(user)=>{
    const access_token = jwt.sign({id : user._id},process.env.SECRET_ACCESS_KEY)
    return{
        access_token,
        profile_img : user.personal_info.profile_img,
        username : user.personal_info.username,
        fullname : user.personal_info.fullname
    }
}
const generateUsername = async (email) =>{
    let username = email.split("@")[0];

    let isUsernameNotUnique = await User.exists({"personal_info.username": username}).then((result)=>result)

    isUsernameNotUnique ? username += nanoid().substring(0,5) : "";
    return username;

}

server.get("/get-upload-url",(req,res) =>{
    generateUploadURL().then(url=>res.status(200).json({uploadURL : url}))
    .catch(err => {
        console.log(err.message);
        res.status(500).json({error : err.message})
    })

})

server.post("/signup",(req,res)=>{
    let {fullname,email,password} = req.body;
    
    if(fullname.length < 3){
        return res.status(403).json({"error":"Fullname must be atleast 4 letters long"});
    }
    if (!email.length){
        return res.status(403).json({"error":"Enter email"})
    }
    if(!emailRegex.test(email)){
        return res.status(403).json({"error":"Invalid Email"})
    }
    if (!passwordRegex.test(password)){
        return res.status(403).json({"error":"Password must be 6 to 20 characters long with a numeric ,a uppercase and a lowercase character"})
    }

    bcrypt.hash(password,10,async (err,hashed_password)=>{
        let username = await generateUsername(email);
        let user = new User({
            personal_info :{fullname,email,password:hashed_password,username}
        })

        user.save().then((u) =>{
            return res.status(200).json(formatDataToSend(u))

        })
        .catch(err =>{
            if (err.code == 11000){
                return res.status(500).json({"error" : "Email Already Exist"})
            }
            return res.status(500).json({"error" : err.message})
        })
        console.log(hashed_password)

    })
    // return res.status(200).json({"status" : "okay"});
})

server.post("/signin",(req,res)=>{
    let {email,password} = req.body;

    User.findOne({"personal_info.email" : email})
    .then((user)=>{
        if (!user){
            return res.status(403).json({"error" : "Email not found"});
        }
        if (!user.google_auth){
            bcrypt.compare(password,user.personal_info.password ,(err,result) =>{
                if (err){
                    return res.status(403).json({"error" : "Error Occured while login ,please try again"});
                }
                if(!result){
                    return res.status(403).json({"error" : "Incorrect Password"});
                }
                else{
                    return res.status(200).json(formatDataToSend(user));
                }
    
            })

        }
        else{
            return res.status(403).json({"error":"Account was created with google, try logging in with google"})
        }
        
        // console.log(user)
        // return res.json({"status" : "User Document Found"})
    
    })
    .catch(err =>{
        console.log(err.message);
        res.status(500).json({"error" : err.message})
    })
})

server.post("/google-auth",async(req,res) => {
    let {access_token} = req.body;
    getAuth()
    .verifyIdToken(access_token)
    .then(async(decodeUser) =>{
        let {email,name,picture} = decodeUser;
        picture = picture.replace("s96-c","s384-c");
        let user = await User.findOne({"personal_info.email":email}).select(`personal_info.fullname personal_info.username 
            personal_info.profile_img google_auth`).then((u) => {
                return u || null
        })
        .catch((err) => {
            return res.status(500).json({"error": err.message})
        })
        if (user){ //login
            if(!user.google_auth){
                return res.status(403).json({"error" :"this email was signed up without google,please log in with password to access the acc"})
            }
        }
        else{ // signup
            let username = await generateUsername(email);
            user = new User({
                personal_info :{fullname : name,email , profile_img : picture,username},
                google_auth : true,
            })
            await user.save().then((u) => {
                user = u;
            })
            .catch((err) =>{
                return res.status(500).json({"error" : err.message})
            })
        }
        return res.status(200).json(formatDataToSend(user))

    })
    .catch((err) => {
        res.status(500).json({"error" : "Failed to authenticate with you with google, try with some other google account"})
    })
})

server.post("/create-blog", verifyJWT, (req,res)=>{
    // console.log(req.body)
    // return res.json(req.body)

    let authorId = req.user;
    let {title, des, banner, tags, content, draft } = req.body;


    if (!title.length){
        return res.status(403).json({error : "You must provide a title to publish the blog"})
    }

    if (!draft){
        if (!des.length || des.length > 200){
            res.status(403).json({error : "You must provide blog description under 200 characters"})
        }
    
        if (!banner.length){
            res.status(403).json({error : "You must provide blog banner to publish"})
        }
    
        if (!content.blocks.length){
            res.status(403).json({error : "There must be some blog content to publish it"})
        }
    
        if (!tags.length || tags.length > 10){
            return res.status(403).json({error: "Provide tags in order to publish blog"})
        }

    }
    

    tags = tags.map(tag => tag.toLowerCase());

    let blog_id = title.replace(/[^a-zA-Z0_9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid();
    // console.log(blogId);

    // return res.json({status : 'done'})

    let blog = new Blog({
        title, des, banner, content, tags, author: authorId, blog_id, draft: Boolean(draft)
    })

    blog.save().then(blog => {
        let incrementVal = draft ? 0 : 1;
        User.findOneAndUpdate({ _id : authorId}, { $inc : {"account_info.total_posts":incrementVal}, 
        $push:{"blogs" : blog._id}})
        .then(user => {
            return res.status(200).json({id : blog.blog_id})
        })
        .catch(err => {
            return res.status(500).json({error : "Failed to update total post number"})
        })
    })
    .catch(err => {
        return res.status(500).json({error : err.message})
    })
}) 

server.get("/latest-blogs", (req,res) => {

    let maxlimit = 4;

    Blog.find({draft : false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({publishedAt : -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxlimit)
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch((err) => {
        return res.status(500).json({error : err.message})
    })
})


server.listen(PORT,()=>{
    console.log('listening on port ' + PORT);
})