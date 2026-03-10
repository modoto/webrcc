const Users = require("../models/UserModel");
const pool = require('../config/db');
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class DashboardController {
  static async index(req, res) {

    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    console.log(user_id);
    res.render("dashboard/index", {
      title: "Maps",
      layout: "layouts/layout_dashboard",
      id: "",
      type: "all",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles
    });
  }

  static async dashboard2(req, res) {

    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    console.log(user_id);
    res.render("dashboard/dashboard1", {
      title: "Maps",
      layout: "layouts/layout_dashboard",
      id: "",
      type: "all",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles
    });
  }

  static async getCamera (req, res) {
      try {
          const q = `select u.unit_id, 
          u.mtcam_id , m.ip_address as ip_mtcam, m.stream_url as ws_mtcam,  
          u.bwcam_id, b.ip_address as ip_bwcam, b.stream_url as ws_bwcam  
          FROM unit u
          left join mtcam m  on u.mtcam_id  = m.mtcam_id 
          left join bwcam b  on u.bwcam_id   = b.bwcam_id
          where u.status=1 order by u.unit_id `;
          const { rows } = await pool.query(q);
          
  
          res.json({ code: 200, status: true, message: 'Success', data : rows });
      } catch (error) {
          console.error(error);
          res.json({ code: 500, status: false, message: error });
      }
  }

}

module.exports = DashboardController;
