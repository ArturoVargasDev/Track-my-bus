//Cuando haya cambios en el proyecto FORK
git push fork main

mariadb -h kodama.proxy.rlwy.net -u root -pttrFzaYKlLpmsWZzXGVqYQnDdxkJPyMB --port 37630 --protocol=TCP --ssl-verify-server-cert=FALSE track_my_bus -e "INSERT INTO usuarios (rol_id, nombre, apellidos, email, password_hash, activo) VALUES (1, 'Admin', 'Sistema', 'admin@trackbus.com', '\$2b\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uEvKECmzi', 1), (2, 'Operador', 'Sistema', 'operador@trackbus.com', '\$2b\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uEvKECmzi', 1), (3, 'Conductor', 'Sistema', 'conductor@trackbus.com', '\$2b\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uEvKECmzi', 1), (4, 'Usuario', 'Sistema', 'usuario@trackbus.com', '\$2b\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uEvKECmzi', 1);"

mariadb -h kodama.proxy.rlwy.net -u root -pttrFzaYKlLpmsWZzXGVqYQnDdxkJPyMB --port 37630 --protocol=TCP --ssl-verify-server-cert=FALSE track_my_bus -e "SELECT id, nombre, email, rol_id FROM usuarios;"

mariadb -h kodama.proxy.rlwy.net -u root -pttrFzaYKlLpmsWZzXGVqYQnDdxkJPyMB --port 37630 --protocol=TCP --ssl-verify-server-cert=FALSE track_my_bus -e "UPDATE usuarios SET password_hash='\$2b\$12\$KaHEcjciZzhzK52UrX0kluL1BusrfTNNdY4scVd08CCgDM1xTZe7K';"
